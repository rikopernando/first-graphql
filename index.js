const {
  GraphQLInt,
  GraphQLID,
  GraphQLObjectType,
  GraphQLString,
  GraphQLBoolean,
  GraphQLSchema,
  GraphQLList,
  GraphQLNonNull,
} = require("graphql");
const express = require("express");
const graphqlHTTP = require("express-graphql");

const massive = require("massive");

const PORT = process.env.PORT || 5678;
const DB_URL =
  "postgres://rikopernando:rikopernando@localhost:5432/learn-graphql";
const server = express();

massive({
  connectionString: DB_URL,
}).then((db) => {
  server.set("db", db);
});

const commentType = new GraphQLObjectType({
  name: "Comment",
  description: "comment on Video",
  fields: {
    id: {
      type: GraphQLID,
    },
    text: {
      type: GraphQLString,
    },
  },
});

const videoType = new GraphQLObjectType({
  name: "Video",
  description: "A video for kode platform",
  args: {
    id: {
      type: GraphQLID,
      description: "ID of the video",
    },
  },
  fields: {
    id: {
      type: GraphQLID,
      description: "The ID of the video",
    },
    title: {
      type: GraphQLString,
      description: "The title of the video",
    },
    duration: {
      type: GraphQLInt,
      description: "Duration of the video",
    },
    watched: {
      type: GraphQLBoolean,
      description: "Wheater od not the video has been watched",
    },
    comments: {
      type: new GraphQLList(commentType),
      description: "Comments for certain video",
    },
  },
});

const queryType = new GraphQLObjectType({
  name: "QueryType",
  description: "The root of query type",
  fields: {
    video: {
      type: videoType,
      args: {
        id: {
          type: new GraphQLNonNull(GraphQLID),
          description: "ID of the video",
        },
      },
      resolve: async (_, args) => {
        const video = await server.get("db").videos.findOne({ id: args.id });
        video.comments = await server
          .get("db")
          .comments.find({ video_id: video.id });
        return video;
      },
    },
    videos: {
      type: new GraphQLList(videoType),
      resolve: async () => {
        const videos = await server.get("db").videos.find({});
        for (let index = 0; index < videos.length; index++) {
          videos[index].comments = await server
            .get("db")
            .comments.find({ video_id: videos[index].id });
        }
        return videos;
      },
    },
  },
});

const mutationType = new GraphQLObjectType({
  name: "MutationType",
  description: "The root of mutation type",
  fields: {
    createVideo: {
      type: videoType,
      args: {
        title: {
          type: GraphQLString,
        },
        duration: {
          type: GraphQLInt,
        },
        watched: {
          type: GraphQLBoolean,
        },
      },
      resolve: (_, args) => server.get("db").videos.insert(args),
    },
    deleteVideo: {
      type: videoType,
      description: "delete video by ID",
      args: {
        id: {
          type: new GraphQLNonNull(GraphQLID),
        },
      },
      resolve: (_, args) => server.get("db").videos.destroy(args.id),
    },
    createComment: {
      type: commentType,
      description: "Create a new comment",
      args: {
        text: {
          type: GraphQLString,
        },
        video_id: {
          type: new GraphQLNonNull(GraphQLID),
        },
      },
      resolve: (_, args) => server.get("db").comments.insert(args),
    },
  },
});

const schema = new GraphQLSchema({
  query: queryType,
  mutation: mutationType,
});

server.use(
  "/graphql",
  graphqlHTTP({
    schema: schema,
    graphiql: true,
  })
);

server.listen(PORT, () =>
  console.log(`Server runnning at http://localhost:${PORT}`)
);
